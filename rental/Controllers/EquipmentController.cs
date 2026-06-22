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