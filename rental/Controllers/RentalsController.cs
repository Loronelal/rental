using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

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

    [HttpPost]
    public async Task<ActionResult<RentalDto>> PostRental(Rental rental)
    {
        // Проверяем существование клиента и техники
        var clientExists = await _context.Clients.AnyAsync(c => c.Id == rental.ClientId);
        if (!clientExists)
            return BadRequest("Клиент не найден");

        var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        // Проверяем, что техника доступна
        if (equipment.Status != "доступен")
            return BadRequest("Техника сейчас недоступна для аренды");

        // Расчёт стоимости
        var hours = (rental.EndDate - rental.StartDate).TotalHours;
        rental.TotalCost = (decimal)hours * equipment.HourlyRate;

        // Устанавливаем статус бронирования
        rental.Status = "активно";

        // Обновляем статус техники на "в аренде"
        equipment.Status = "в аренде";

        _context.Rentals.Add(rental);
        await _context.SaveChangesAsync();

        // Загружаем сохранённую запись с навигационными свойствами для формирования DTO
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

    [HttpPut("{id}")]
    public async Task<IActionResult> PutRental(int id, Rental rental)
    {
        if (id != rental.Id)
            return BadRequest();

        // Если меняются даты или оборудование – пересчитываем стоимость
        var existing = await _context.Rentals
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (existing == null)
            return NotFound();

        // Если изменился equipment_id или даты – пересчёт
        if (existing.EquipmentId != rental.EquipmentId ||
            existing.StartDate != rental.StartDate ||
            existing.EndDate != rental.EndDate)
        {
            var equipment = await _context.Equipment.FindAsync(rental.EquipmentId);
            if (equipment == null)
                return BadRequest("Техника не найдена");

            var hours = (rental.EndDate - rental.StartDate).TotalHours;
            rental.TotalCost = (decimal)hours * equipment.HourlyRate;
        }
        else
        {
            // Иначе сохраняем старую стоимость (или можно пересчитать, если нужно)
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRental(int id)
    {
        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound();

        // Возвращаем технике статус "доступен", если бронирование было активным
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
}