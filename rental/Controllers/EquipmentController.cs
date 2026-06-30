using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Data;
using rental.Entities;
using System.Security.Claims;

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

    // GET: api/equipment (публичный каталог с фильтрацией)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EquipmentDto>>> GetEquipment(
        [FromQuery] int? typeId,
        [FromQuery] int? yearFrom,
        [FromQuery] decimal? priceTo,
        [FromQuery] string? status)
    {
        var query = _context.Equipment
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .Include(e => e.Owner)
            .AsQueryable();

        if (typeId.HasValue)
            query = query.Where(e => e.TypeId == typeId.Value);
        if (yearFrom.HasValue)
            query = query.Where(e => e.Year >= yearFrom.Value);
        if (priceTo.HasValue)
            query = query.Where(e => e.HourlyRate <= priceTo.Value);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(e => e.Status == status);

        var result = await query
            .Select(e => new EquipmentDto
            {
                Id = e.Id,
                Name = e.Name,
                TypeId = e.TypeId,
                TypeName = e.Type.Name,
                TypeImageUrl = e.Type.ImageUrl,
                Year = e.Year,
                HourlyRate = e.HourlyRate,
                Status = e.Status,
                AvgRating = e.Rating != null ? e.Rating.AvgRating : 0,
                RentalCount = e.Rating != null ? e.Rating.RentalCount : 0,
                OwnerName = e.Owner != null ? e.Owner.Name : "",
                OwnerId = e.OwnerId,
                LastMaintenanceDate = e.LastMaintenanceDate  // новое поле
            })
            .ToListAsync();

        return Ok(result);
    }

    // GET: api/equipment/my – моя техника (авторизованный пользователь)
    [Authorize]
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<Equipment>>> GetMyEquipment()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int ownerId = int.Parse(userId);

        var myEquipment = await _context.Equipment
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .Include(e => e.Owner)
            .Where(e => e.OwnerId == ownerId)
            .ToListAsync();

        return Ok(myEquipment);
    }

    // GET: api/equipment/top
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

    // GET: api/equipment/available
    [HttpGet("available")]
    public async Task<ActionResult<IEnumerable<EquipmentDto>>> GetAvailable(
    [FromQuery] int? typeId,
    [FromQuery] DateTime start,
    [FromQuery] DateTime end)
    {
        DateTime startUtc = DateTime.SpecifyKind(start, DateTimeKind.Utc);
        DateTime endUtc = DateTime.SpecifyKind(end, DateTimeKind.Utc);

        var busyIds = await _context.Rentals
            .Where(r => r.Status == "активно" && r.StartDate < endUtc && r.EndDate > startUtc)
            .Select(r => r.EquipmentId)
            .Union(
                _context.Maintenances
                    .Where(m => m.StartDate < endUtc && m.EndDate > startUtc)
                    .Select(m => m.EquipmentId)
            )
            .Distinct()
            .ToListAsync();

        var query = _context.Equipment
            .Where(e => e.Status != "на обслуживании" && !busyIds.Contains(e.Id))
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .Include(e => e.Owner)
            .AsQueryable();

        if (typeId.HasValue)
            query = query.Where(e => e.TypeId == typeId.Value);

        var result = await query
            .Select(e => new EquipmentDto
            {
                Id = e.Id,
                Name = e.Name,
                TypeId = e.TypeId,
                TypeName = e.Type.Name,
                TypeImageUrl = e.Type.ImageUrl,
                Year = e.Year,
                HourlyRate = e.HourlyRate,
                Status = e.Status,
                AvgRating = e.Rating != null ? e.Rating.AvgRating : 0,
                RentalCount = e.Rating != null ? e.Rating.RentalCount : 0,
                OwnerName = e.Owner != null ? e.Owner.Name : "",
                OwnerId = e.OwnerId,
                LastMaintenanceDate = e.LastMaintenanceDate
            })
            .ToListAsync();

        return Ok(result);
    }

    // GET: api/equipment/{id}/schedule
    [HttpGet("{id}/schedule")]
    public async Task<ActionResult> GetSchedule(
        int id,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var now = DateTime.UtcNow;
        var start = from ?? now;
        var end = to ?? now.AddDays(30);

        var rentals = await _context.Rentals
            .Where(r => r.EquipmentId == id && r.Status == "активно" && r.StartDate < end && r.EndDate > start)
            .Include(r => r.Client)
            .Select(r => new
            {
                r.StartDate,
                r.EndDate,
                ClientName = r.Client.Name
            })
            .ToListAsync();

        var maintenances = await _context.Maintenances
            .Where(m => m.EquipmentId == id && m.StartDate < end && m.EndDate > start)
            .Select(m => new { m.StartDate, m.EndDate, m.Type })
            .ToListAsync();

        return Ok(new { rentals, maintenances });
    }

    // GET: api/equipment/{id} – детальная информация
    [HttpGet("{id}")]
    public async Task<ActionResult<EquipmentDto>> GetEquipment(int id)
    {
        var equipment = await _context.Equipment
            .Include(e => e.Type)
            .Include(e => e.Rating)
            .Include(e => e.Owner)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (equipment == null)
            return NotFound();

        var dto = new EquipmentDto
        {
            Id = equipment.Id,
            Name = equipment.Name,
            TypeName = equipment.Type?.Name ?? "",
            TypeImageUrl = equipment.Type?.ImageUrl,
            Year = equipment.Year,
            HourlyRate = equipment.HourlyRate,
            Status = equipment.Status,
            AvgRating = equipment.Rating?.AvgRating ?? 0,
            RentalCount = equipment.Rating?.RentalCount ?? 0,
            OwnerName = equipment.Owner?.Name ?? "",
            OwnerId = equipment.OwnerId,
            LastMaintenanceDate = equipment.LastMaintenanceDate  // новое поле
        };

        return Ok(dto);
    }

    // POST: api/equipment
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Equipment>> PostEquipment(Equipment equipment)
    {
        var typeExists = await _context.EquipmentTypes.AnyAsync(t => t.Id == equipment.TypeId);
        if (!typeExists)
            return BadRequest("Указанный тип техники не существует");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int currentUserId = int.Parse(userId);
        var user = await _context.Clients.FindAsync(currentUserId);

        if (user == null)
            return BadRequest("Пользователь не найден");

        // Если пользователь не админ, владельцем становится он сам
        if (user.Role != "Admin")
        {
            equipment.OwnerId = currentUserId;
        }
        else
        {
            // Админ может указать OwnerId в теле запроса, иначе ставит себя
            if (!equipment.OwnerId.HasValue || equipment.OwnerId == 0)
                equipment.OwnerId = currentUserId;
        }

        // Приводим дату последнего ТО к UTC, если она передана
        if (equipment.LastMaintenanceDate.HasValue)
            equipment.LastMaintenanceDate = DateTime.SpecifyKind(equipment.LastMaintenanceDate.Value, DateTimeKind.Utc);

        _context.Equipment.Add(equipment);
        await _context.SaveChangesAsync();

        // Создаём запись рейтинга
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

    // PUT: api/equipment/{id}
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> PutEquipment(int id, Equipment equipment)
    {
        if (id != equipment.Id)
            return BadRequest();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int currentUserId = int.Parse(userId);
        var currentUser = await _context.Clients.FindAsync(currentUserId);

        var existing = await _context.Equipment.FindAsync(id);
        if (existing == null)
            return NotFound();

        if (existing.OwnerId != currentUserId && currentUser?.Role != "Admin")
            return Forbid("Вы не являетесь владельцем этой техники");

        var typeExists = await _context.EquipmentTypes.AnyAsync(t => t.Id == equipment.TypeId);
        if (!typeExists)
            return BadRequest("Указанный тип техники не существует");

        existing.Name = equipment.Name;
        existing.TypeId = equipment.TypeId;
        existing.Year = equipment.Year;
        existing.HourlyRate = equipment.HourlyRate;
        existing.Status = equipment.Status;

        // Приводим дату последнего ТО к UTC, если она передана
        if (equipment.LastMaintenanceDate.HasValue)
            existing.LastMaintenanceDate = DateTime.SpecifyKind(equipment.LastMaintenanceDate.Value, DateTimeKind.Utc);
        else
            existing.LastMaintenanceDate = null;

        _context.Entry(existing).State = EntityState.Modified;
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

    // DELETE: api/equipment/{id}
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEquipment(int id)
    {
        // Загружаем технику вместе с рейтингом
        var equipment = await _context.Equipment
            .Include(e => e.Rating)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (equipment == null)
            return NotFound();

        // Проверка прав
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int currentUserId = int.Parse(userId);
        var currentUser = await _context.Clients.FindAsync(currentUserId);

        if (equipment.OwnerId != currentUserId && currentUser?.Role != "Admin")
            return Forbid("Вы не являетесь владельцем этой техники");

        // Если есть связанный рейтинг – удаляем его вручную
        if (equipment.Rating != null)
            _context.EquipmentRatings.Remove(equipment.Rating);

        // Удаляем технику
        _context.Equipment.Remove(equipment);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}