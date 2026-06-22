using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EquipmentTypesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EquipmentTypesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EquipmentType>>> GetEquipmentTypes()
    {
        return await _context.EquipmentTypes
            .Include(t => t.EquipmentItems)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EquipmentType>> GetEquipmentType(int id)
    {
        var type = await _context.EquipmentTypes
            .Include(t => t.EquipmentItems)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (type == null)
            return NotFound();

        return type;
    }

    [HttpPost]
    public async Task<ActionResult<EquipmentType>> PostEquipmentType(EquipmentType type)
    {
        _context.EquipmentTypes.Add(type);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetEquipmentType), new { id = type.Id }, type);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutEquipmentType(int id, EquipmentType type)
    {
        if (id != type.Id)
            return BadRequest();

        _context.Entry(type).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.EquipmentTypes.AnyAsync(t => t.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEquipmentType(int id)
    {
        var type = await _context.EquipmentTypes.FindAsync(id);
        if (type == null)
            return NotFound();

        _context.EquipmentTypes.Remove(type);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}