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

    // =============================================
    // Вспомогательные методы
    // =============================================

    /// <summary>
    /// Обновляет статус техники на основе активных аренд в текущий момент.
    /// Если есть активная аренда (StartDate <= now < EndDate), статус = "в аренде", иначе "доступен".
    /// </summary>
    private async Task UpdateEquipmentStatus(int equipmentId)
    {
        var equipment = await _context.Equipment.FindAsync(equipmentId);
        if (equipment == null) return;

        var now = DateTime.UtcNow;
        var hasActiveRental = await _context.Rentals
            .AnyAsync(r => r.EquipmentId == equipmentId
                           && r.Status == "активно"
                           && r.StartDate <= now
                           && r.EndDate > now);

        equipment.Status = hasActiveRental ? "в аренде" : "доступен";
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Завершает все просроченные аренды (EndDate < now) и обновляет статус техники.
    /// </summary>
    private async Task CompleteOverdueRentals()
    {
        var now = DateTime.UtcNow;
        var overdueRentals = await _context.Rentals
            .Include(r => r.Equipment)
            .Where(r => r.Status == "активно" && r.EndDate < now)
            .ToListAsync();

        if (!overdueRentals.Any()) return;

        // Завершаем аренды
        foreach (var rental in overdueRentals)
        {
            rental.Status = "завершено";
        }
        await _context.SaveChangesAsync();

        // Обновляем статус техники для всех задействованных equipment
        var equipmentIds = overdueRentals.Select(r => r.EquipmentId).Distinct();
        foreach (var eqId in equipmentIds)
        {
            await UpdateEquipmentStatus(eqId);
        }
    }

    // =============================================
    // GET: api/rentals (администратор – все бронирования)
    // =============================================
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RentalDto>>> GetRentals()
    {
        await CompleteOverdueRentals();

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
                Status = r.Status,
                PaidAmount = r.Payments.Sum(p => p.Amount)
            })
            .ToListAsync();

        return Ok(rentals);
    }

    // =============================================
    // GET: api/rentals/{id} – детали одного бронирования
    // =============================================
    [HttpGet("{id}")]
    public async Task<ActionResult<RentalDto>> GetRental(int id)
    {
        await CompleteOverdueRentals();

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
                Status = r.Status,
                PaidAmount = r.Payments.Sum(p => p.Amount)
            })
            .FirstOrDefaultAsync();

        if (rental == null)
            return NotFound();

        return Ok(rental);
    }

    // =============================================
    // GET: api/rentals/my – бронирования текущего пользователя
    // =============================================
    [Authorize]
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<RentalDto>>> GetMyRentals()
    {
        await CompleteOverdueRentals();

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
                Status = r.Status,
                PaidAmount = r.Payments.Sum(p => p.Amount)
            })
            .ToListAsync();

        return Ok(rentals);
    }

    // =============================================
    // POST: api/rentals – создание бронирования
    // =============================================
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RentalDto>> PostRental(RentalCreateDto dto)
    {
        // 1. Получаем ID пользователя
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int clientId;
        if (User.IsInRole("Admin") && dto.ClientId.HasValue)
            clientId = dto.ClientId.Value;
        else
            clientId = int.Parse(userId);

        // 2. Проверяем клиента
        var client = await _context.Clients.FindAsync(clientId);
        if (client == null)
            return BadRequest("Клиент не найден");

        // 3. Проверяем технику
        var equipment = await _context.Equipment.FindAsync(dto.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        // 4. Запрет бронирования своей техники
        if (equipment.OwnerId == clientId)
            return BadRequest("Нельзя забронировать собственную технику");

        // 5. Проверка пересечения с обслуживанием
        var maintenanceConflict = await _context.Maintenances
            .AnyAsync(m => m.EquipmentId == equipment.Id
                           && m.StartDate < dto.EndDate
                           && m.EndDate > dto.StartDate);
        if (maintenanceConflict)
            return BadRequest("Техника на обслуживании в выбранный период");

        // 6. Проверка пересечения с другими активными арендами
        var rentalConflict = await _context.Rentals
            .AnyAsync(r => r.EquipmentId == equipment.Id
                           && r.Status == "активно"
                           && r.StartDate < dto.EndDate
                           && r.EndDate > dto.StartDate);
        if (rentalConflict)
            return BadRequest("Техника уже забронирована в выбранный период");

        // 7. Создаём аренду
        var rental = new Rental
        {
            ClientId = clientId,
            EquipmentId = dto.EquipmentId,
            StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc),
            Status = "активно"
        };

        var hours = (rental.EndDate - rental.StartDate).TotalHours;
        if (hours <= 0)
            return BadRequest("Дата окончания должна быть позже даты начала");

        rental.TotalCost = (decimal)hours * equipment.HourlyRate;

        // 8. Сохраняем
        _context.Rentals.Add(rental);
        await _context.SaveChangesAsync();

        // 9. Обновляем статус техники (может измениться, если аренда началась прямо сейчас)
        await UpdateEquipmentStatus(equipment.Id);

        // 10. Формируем DTO для ответа
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
            Status = savedRental.Status,
            PaidAmount = savedRental.Payments.Sum(p => p.Amount)
        };

        return CreatedAtAction(nameof(GetRental), new { id = rental.Id }, rentalDto);
    }

    // =============================================
    // PUT: api/rentals/{id} – обновление бронирования (администратор)
    // =============================================
    [HttpPut("{id}")]
    public async Task<IActionResult> PutRental(int id, Rental rental)
    {
        if (id != rental.Id)
            return BadRequest();

        // Приводим даты к UTC
        rental.StartDate = DateTime.SpecifyKind(rental.StartDate, DateTimeKind.Utc);
        rental.EndDate = DateTime.SpecifyKind(rental.EndDate, DateTimeKind.Utc);

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

    // =============================================
    // DELETE: api/rentals/{id} – удаление (администратор)
    // =============================================
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRental(int id)
    {
        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound();

        _context.Rentals.Remove(rental);
        await _context.SaveChangesAsync();

        // Обновляем статус техники
        await UpdateEquipmentStatus(rental.EquipmentId);

        return NoContent();
    }

    // =============================================
    // PUT: api/rentals/{id}/cancel – отмена бронирования текущим пользователем
    // =============================================
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

        if (rental.ClientId != clientId)
            return Forbid();

        if (rental.Status != "активно")
            return BadRequest("Бронирование уже завершено или отменено");

        rental.Status = "отменено";
        await _context.SaveChangesAsync();

        // Обновляем статус техники
        await UpdateEquipmentStatus(rental.EquipmentId);

        return NoContent();
    }

    // =============================================
    // PUT: api/rentals/{id}/extend – продление аренды на 1 час
    // =============================================
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

        // Приводим существующие даты к UTC
        var startUtc = DateTime.SpecifyKind(rental.StartDate, DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(rental.EndDate, DateTimeKind.Utc);

        var newEnd = endUtc.AddHours(1);
        newEnd = DateTime.SpecifyKind(newEnd, DateTimeKind.Utc);

        // Проверяем конфликт с другими арендами
        var conflict = await _context.Rentals
            .AnyAsync(r => r.EquipmentId == rental.EquipmentId
                           && r.Id != id
                           && r.Status == "активно"
                           && r.StartDate < newEnd
                           && r.EndDate > endUtc);
        if (conflict)
            return BadRequest("Техника уже забронирована на этот час");

        // Проверяем конфликт с ТО
        var maintenanceConflict = await _context.Maintenances
            .AnyAsync(m => m.EquipmentId == rental.EquipmentId
                           && m.StartDate < newEnd
                           && m.EndDate > endUtc);
        if (maintenanceConflict)
            return BadRequest("Техника на обслуживании в этот час");

        var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        var hours = (newEnd - startUtc).TotalHours;
        rental.TotalCost = (decimal)hours * equipment.HourlyRate;
        rental.EndDate = newEnd;

        await _context.SaveChangesAsync();
        return Ok(new { newTotal = rental.TotalCost, newEnd = rental.EndDate });
    }
}