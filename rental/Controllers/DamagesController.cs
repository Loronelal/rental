using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DamagesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DamagesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Damage>>> GetDamages()
    {
        return await _context.Damages
            .Include(d => d.Rental)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Damage>> GetDamage(int id)
    {
        var damage = await _context.Damages
            .Include(d => d.Rental)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (damage == null)
            return NotFound();

        return damage;
    }

    [HttpPost]
    public async Task<ActionResult<Damage>> PostDamage(Damage damage)
    {
        var rentalExists = await _context.Rentals.AnyAsync(r => r.Id == damage.RentalId);
        if (!rentalExists)
            return BadRequest("Бронирование не найдено");

        _context.Damages.Add(damage);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDamage), new { id = damage.Id }, damage);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutDamage(int id, Damage damage)
    {
        if (id != damage.Id)
            return BadRequest();

        _context.Entry(damage).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Damages.AnyAsync(d => d.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDamage(int id)
    {
        var damage = await _context.Damages.FindAsync(id);
        if (damage == null)
            return NotFound();

        _context.Damages.Remove(damage);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}