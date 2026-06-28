using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Data;
using rental.Entities;
using System.Security.Claims;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class RentalsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RentalsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/rentals (для администратора – список всех бронирований)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RentalDto>>> GetRentals()
    {
        var rentals = await _context.Rentals
            .Select(r => new RentalDto
            {
                Id = r.Id,
                ClientId = r.ClientId,
                ClientName = r.Client.Name,
                EquipmentId = r.EquipmentId,
                EquipmentName = r.Equipment.Name,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                TotalCost = r.TotalCost,
                Status = r.Status
            })
            .ToListAsync();

        return Ok(rentals);
    }

    // GET: api/rentals/{id} – детали одного бронирования
    [HttpGet("{id}")]
    public async Task<ActionResult<RentalDto>> GetRental(int id)
    {
        var rental = await _context.Rentals
            .Where(r => r.Id == id)
            .Select(r => new RentalDto
            {
                Id = r.Id,
                ClientId = r.ClientId,
                ClientName = r.Client.Name,
                EquipmentId = r.EquipmentId,
                EquipmentName = r.Equipment.Name,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                TotalCost = r.TotalCost,
                Status = r.Status
            })
            .FirstOrDefaultAsync();

        if (rental == null)
            return NotFound();

        return Ok(rental);
    }

    // GET: api/rentals/my – бронирования текущего пользователя (личный кабинет)
    [Authorize]
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<RentalDto>>> GetMyRentals()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int clientId = int.Parse(userId);

        var rentals = await _context.Rentals
            .Where(r => r.ClientId == clientId)
            .Select(r => new RentalDto
            {
                Id = r.Id,
                ClientId = r.ClientId,
                ClientName = r.Client.Name,
                EquipmentId = r.EquipmentId,
                EquipmentName = r.Equipment.Name,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                TotalCost = r.TotalCost,
                Status = r.Status
            })
            .ToListAsync();

        return Ok(rentals);
    }

    // POST: api/rentals – создание бронирования (только для авторизованных)
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RentalDto>> PostRental(RentalCreateDto dto)
    {
        // 1. Получаем ID пользователя из токена
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int clientId;
        // 2. Если пользователь админ и передан ClientId – используем его, иначе берём из токена
        if (User.IsInRole("Admin") && dto.ClientId.HasValue)
            clientId = dto.ClientId.Value;
        else
            clientId = int.Parse(userId);

        // 3. Проверяем существование клиента
        var client = await _context.Clients.FindAsync(clientId);
        if (client == null)
            return BadRequest("Клиент не найден");

        // 4. Создаём объект Rental из DTO
        var rental = new Rental
        {
            ClientId = clientId,
            EquipmentId = dto.EquipmentId,
            StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc),
            Status = "активно"
        };

        // 5. Проверяем существование техники
        var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        // 6. Проверяем, что техника доступна
        if (equipment.Status != "доступен")
            return BadRequest("Техника сейчас недоступна для аренды");

        // 7. Проверяем пересечение с обслуживанием
        var maintenanceConflict = await _context.Maintenances
            .AnyAsync(m => m.EquipmentId == rental.EquipmentId
                           && m.StartDate < rental.EndDate
                           && m.EndDate > rental.StartDate);
        if (maintenanceConflict)
            return BadRequest("Техника на обслуживании в выбранный период");

        // 8. Расчёт стоимости
        var hours = (rental.EndDate - rental.StartDate).TotalHours;
        if (hours <= 0)
            return BadRequest("Дата окончания должна быть позже даты начала");

        rental.TotalCost = (decimal)hours * equipment.HourlyRate;

        // 9. Устанавливаем статусы
        equipment.Status = "в аренде";

        // 10. Сохраняем
        _context.Rentals.Add(rental);
        await _context.SaveChangesAsync();

        // 11. Формируем DTO для ответа
        var savedRental = await _context.Rentals
            .Include(r => r.Client)
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(r => r.Id == rental.Id);

        var rentalDto = new RentalDto
        {
            Id = savedRental.Id,
            ClientId = savedRental.ClientId,
            ClientName = savedRental.Client?.Name ?? "",
            EquipmentId = savedRental.EquipmentId,
            EquipmentName = savedRental.Equipment?.Name ?? "",
            StartDate = savedRental.StartDate,
            EndDate = savedRental.EndDate,
            TotalCost = savedRental.TotalCost,
            Status = savedRental.Status
        };

        return CreatedAtAction(nameof(GetRental), new { id = rental.Id }, rentalDto);
    }

    // PUT: api/rentals/{id} – обновление бронирования (администратор)
    [HttpPut("{id}")]
    public async Task<IActionResult> PutRental(int id, Rental rental)
    {
        if (id != rental.Id)
            return BadRequest();

        var existing = await _context.Rentals
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (existing == null)
            return NotFound();

        // Если изменились даты или оборудование – пересчёт стоимости
        if (existing.EquipmentId != rental.EquipmentId ||
            existing.StartDate != rental.StartDate ||
            existing.EndDate != rental.EndDate)
        {
            var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
            if (equipment == null)
                return BadRequest("Техника не найдена");

            var hours = (rental.EndDate - rental.StartDate).TotalHours;
            if (hours <= 0)
                return BadRequest("Дата окончания должна быть позже даты начала");

            rental.TotalCost = (decimal)hours * equipment.HourlyRate;
        }
        else
        {
            rental.TotalCost = existing.TotalCost;
        }

        _context.Entry(rental).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Rentals.AnyAsync(r => r.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/rentals/{id} – удаление (администратор)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRental(int id)
    {
        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound();

        if (rental.Status == "активно")
        {
            var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
            if (equipment != null)
                equipment.Status = "доступен";
        }

        _context.Rentals.Remove(rental);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/rentals/{id}/cancel – отмена бронирования текущим пользователем
    [Authorize]
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelRental(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int clientId = int.Parse(userId);

        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound();

        // Проверяем, что бронирование принадлежит текущему пользователю
        if (rental.ClientId != clientId)
            return Forbid();

        if (rental.Status != "активно")
            return BadRequest("Бронирование уже завершено или отменено");

        rental.Status = "отменено";
        var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
        if (equipment != null)
            equipment.Status = "доступен";

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/rentals/{id}/extend – продление аренды на 1 час (только для авторизованного владельца)
    [Authorize]
    [HttpPut("{id}/extend")]
    public async Task<IActionResult> ExtendRental(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int clientId = int.Parse(userId);

        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound();

        if (rental.ClientId != clientId)
            return Forbid();

        if (rental.Status != "активно")
            return BadRequest("Бронирование не активно");

        var newEnd = rental.EndDate.AddHours(1);

        // Проверяем, не занята ли техника в этот час другими арендами
        var conflict = await _context.Rentals
            .AnyAsync(r => r.EquipmentId == rental.EquipmentId
                           && r.Id != id
                           && r.Status == "активно"
                           && r.StartDate < newEnd
                           && r.EndDate > rental.EndDate);
        if (conflict)
            return BadRequest("Техника уже забронирована на этот час");

        // Проверяем обслуживание
        var maintenanceConflict = await _context.Maintenances
            .AnyAsync(m => m.EquipmentId == rental.EquipmentId
                           && m.StartDate < newEnd
                           && m.EndDate > rental.EndDate);
        if (maintenanceConflict)
            return BadRequest("Техника на обслуживании в этот час");

        var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        var hours = (newEnd - rental.StartDate).TotalHours;
        rental.TotalCost = (decimal)hours * equipment.HourlyRate;
        rental.EndDate = newEnd;

        await _context.SaveChangesAsync();
        return Ok(new { newTotal = rental.TotalCost, newEnd = rental.EndDate });
    }
}