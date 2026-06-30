using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;
using System.Security.Claims;

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

    // GET: api/maintenances
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceDto>>> GetMaintenances()
    {
        var maintenances = await _context.Maintenances
            .Include(m => m.Equipment)
            .Select(m => new MaintenanceDto
            {
                Id = m.Id,
                EquipmentId = m.EquipmentId,
                EquipmentName = m.Equipment != null ? m.Equipment.Name : null,
                StartDate = m.StartDate,
                EndDate = m.EndDate,
                Type = m.Type,
                Cost = m.Cost
            })
            .ToListAsync();

        return Ok(maintenances);
    }

    // GET: api/maintenances/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<MaintenanceDto>> GetMaintenance(int id)
    {
        var maintenance = await _context.Maintenances
            .Include(m => m.Equipment)
            .Where(m => m.Id == id)
            .Select(m => new MaintenanceDto
            {
                Id = m.Id,
                EquipmentId = m.EquipmentId,
                EquipmentName = m.Equipment != null ? m.Equipment.Name : null,
                StartDate = m.StartDate,
                EndDate = m.EndDate,
                Type = m.Type,
                Cost = m.Cost
            })
            .FirstOrDefaultAsync();

        if (maintenance == null)
            return NotFound();

        return Ok(maintenance);
    }

    // GET: api/maintenances/overdue
    [HttpGet("overdue")]
    public async Task<ActionResult<IEnumerable<MaintenanceDto>>> GetOverdue()
    {
        var now = DateTime.UtcNow;

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? currentUserId = null;
        if (!string.IsNullOrEmpty(userId))
            currentUserId = int.Parse(userId);

        var query = _context.Maintenances
            .Include(m => m.Equipment)
            .Where(m => m.EndDate < now && m.Equipment != null && m.Equipment.Status == "на обслуживании");

        if (currentUserId.HasValue && !User.IsInRole("Admin"))
        {
            query = query.Where(m => m.Equipment != null && m.Equipment.OwnerId == currentUserId.Value);
        }
        else if (!currentUserId.HasValue)
        {
            return Ok(Enumerable.Empty<MaintenanceDto>());
        }

        var overdue = await query
            .Select(m => new MaintenanceDto
            {
                Id = m.Id,
                EquipmentId = m.EquipmentId,
                EquipmentName = m.Equipment != null ? m.Equipment.Name : null,
                StartDate = m.StartDate,
                EndDate = m.EndDate,
                Type = m.Type,
                Cost = m.Cost
            })
            .ToListAsync();

        return Ok(overdue);
    }

    // POST: api/maintenances
    [HttpPost]
    public async Task<ActionResult<MaintenanceDto>> PostMaintenance(MaintenanceCreateDto dto)
    {
        // Проверяем существование техники
        var equipment = await _context.Equipment.FindAsync(dto.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        // Приводим даты к UTC
        var startUtc = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc);

        var maintenance = new Maintenance
        {
            EquipmentId = dto.EquipmentId,
            StartDate = startUtc,
            EndDate = endUtc,
            Type = dto.Type,
            Cost = dto.Cost
        };

        // Если ТО активно сейчас – обновляем статус техники
        if (startUtc <= DateTime.UtcNow && endUtc >= DateTime.UtcNow)
        {
            equipment.Status = "на обслуживании";
        }

        _context.Maintenances.Add(maintenance);
        await _context.SaveChangesAsync();

        var result = new MaintenanceDto
        {
            Id = maintenance.Id,
            EquipmentId = maintenance.EquipmentId,
            EquipmentName = equipment.Name,
            StartDate = maintenance.StartDate,
            EndDate = maintenance.EndDate,
            Type = maintenance.Type,
            Cost = maintenance.Cost
        };

        return CreatedAtAction(nameof(GetMaintenance), new { id = maintenance.Id }, result);
    }

    // PUT: api/maintenances/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> PutMaintenance(int id, MaintenanceUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest();

        var maintenance = await _context.Maintenances.FindAsync(id);
        if (maintenance == null)
            return NotFound();

        // Проверяем существование техники
        var equipment = await _context.Equipment.FindAsync(dto.EquipmentId);
        if (equipment == null)
            return BadRequest("Техника не найдена");

        // Приводим даты к UTC
        var startUtc = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc);

        maintenance.EquipmentId = dto.EquipmentId;
        maintenance.StartDate = startUtc;
        maintenance.EndDate = endUtc;
        maintenance.Type = dto.Type;
        maintenance.Cost = dto.Cost;

        // Обновляем статус техники (если ТО активно)
        if (startUtc <= DateTime.UtcNow && endUtc >= DateTime.UtcNow)
        {
            equipment.Status = "на обслуживании";
        }
        else
        {
            // Если ТО закончилось, но статус всё ещё "на обслуживании" – сбрасываем
            if (equipment.Status == "на обслуживании" && endUtc < DateTime.UtcNow)
            {
                equipment.Status = "доступен";
            }
        }

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

    // DELETE: api/maintenances/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMaintenance(int id)
    {
        var maintenance = await _context.Maintenances
            .Include(m => m.Equipment)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (maintenance == null)
            return NotFound();

        _context.Maintenances.Remove(maintenance);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}