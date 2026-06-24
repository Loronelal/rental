using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EquipmentController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EquipmentController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Equipment>>> GetEquipment()
    {
        return await _context.Equipment
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .Include(e => e.Rentals)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Equipment>> GetEquipment(int id)
    {
        var equipment = await _context.Equipment
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .Include(e => e.Rentals)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (equipment == null)
            return NotFound();

        return equipment;
    }


    [HttpGet("top")]
    public async Task<ActionResult<IEnumerable<object>>> GetTopRated()
    {
        var top = await _context.EquipmentRatings
            .OrderByDescending(r => r.RentalCount)
            .ThenByDescending(r => r.AvgRating)
            .Take(5)
            .Select(r => new
            {
                r.EquipmentId,
                EquipmentName = r.Equipment.Name,
                r.RentalCount,
                r.AvgRating
            })
            .ToListAsync();
        return Ok(top);
    }


    [HttpGet("available")]
    public async Task<ActionResult<IEnumerable<EquipmentDto>>> GetAvailable(
    [FromQuery] int? typeId,
    [FromQuery] DateTime start,
    [FromQuery] DateTime end)
    {
        // Все ID техники, занятой в арендах или на обслуживании в указанный интервал
        var busyIds = await _context.Rentals
            .Where(r => r.Status == "активно" && r.StartDate < end && r.EndDate > start)
            .Select(r => r.EquipmentId)
            .Union(
                _context.Maintenances
                    .Where(m => m.StartDate < end && m.EndDate > start)
                    .Select(m => m.EquipmentId)
            )
            .Distinct()
            .ToListAsync();

        var query = _context.Equipment
            .Where(e => e.Status == "доступен" && !busyIds.Contains(e.Id))
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .AsQueryable();

        if (typeId.HasValue)
            query = query.Where(e => e.TypeId == typeId.Value);

        var result = await query
            .Select(e => new EquipmentDto
            {
                Id = e.Id,
                Name = e.Name,
                TypeName = e.Type.Name,
                Year = e.Year,
                HourlyRate = e.HourlyRate,
                Status = e.Status,
                AvgRating = e.Rating != null ? e.Rating.AvgRating : 0,
                RentalCount = e.Rating != null ? e.Rating.RentalCount : 0
            })
            .ToListAsync();

        return Ok(result);
    }




    [HttpPost]
    public async Task<ActionResult<Equipment>> PostEquipment(Equipment equipment)
    {
        // Проверяем существование типа
        var typeExists = await _context.EquipmentTypes.AnyAsync(t => t.Id == equipment.TypeId);
        if (!typeExists)
            return BadRequest("Указанный тип техники не существует");

        _context.Equipment.Add(equipment);
        await _context.SaveChangesAsync();

        // Создаём запись рейтинга (можно и без неё, но для целостности)
        var rating = new EquipmentRating
        {
            EquipmentId = equipment.Id,
            AvgRating = 0,
            RentalCount = 0
        };
        _context.EquipmentRatings.Add(rating);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEquipment), new { id = equipment.Id }, equipment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutEquipment(int id, Equipment equipment)
    {
        if (id != equipment.Id)
            return BadRequest();

        var typeExists = await _context.EquipmentTypes.AnyAsync(t => t.Id == equipment.TypeId);
        if (!typeExists)
            return BadRequest("Указанный тип техники не существует");

        _context.Entry(equipment).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Equipment.AnyAsync(e => e.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEquipment(int id)
    {
        var equipment = await _context.Equipment.FindAsync(id);
        if (equipment == null)
            return NotFound();

        _context.Equipment.Remove(equipment);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}