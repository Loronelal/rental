using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MaintenancesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MaintenancesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Maintenance>>> GetMaintenances()
    {
        return await _context.Maintenances
            .Include(m => m.Equipment)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Maintenance>> GetMaintenance(int id)
    {
        var maintenance = await _context.Maintenances
            .Include(m => m.Equipment)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (maintenance == null)
            return NotFound();

        return maintenance;
    }

    [HttpPost]
    public async Task<ActionResult<Maintenance>> PostMaintenance(Maintenance maintenance)
    {
        var equipmentExists = await _context.Equipment.AnyAsync(e => e.Id == maintenance.EquipmentId);
        if (!equipmentExists)
            return BadRequest("Техника не найдена");

        // Обновляем статус техники на "на обслуживании", если дата началась
        if (maintenance.StartDate <= DateTime.Now && maintenance.EndDate >= DateTime.Now)
        {
            var equipment = await _context.Equipment.FindAsync(maintenance.EquipmentId);
            if (equipment != null)
                equipment.Status = "на обслуживании";
        }

        _context.Maintenances.Add(maintenance);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMaintenance), new { id = maintenance.Id }, maintenance);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutMaintenance(int id, Maintenance maintenance)
    {
        if (id != maintenance.Id)
            return BadRequest();

        _context.Entry(maintenance).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Maintenances.AnyAsync(m => m.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMaintenance(int id)
    {
        var maintenance = await _context.Maintenances.FindAsync(id);
        if (maintenance == null)
            return NotFound();

        _context.Maintenances.Remove(maintenance);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}