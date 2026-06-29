using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Data;
using rental.Entities;
using System.Security.Claims;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EquipmentRatingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EquipmentRatingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EquipmentRating>>> GetEquipmentRatings()
    {
        return await _context.EquipmentRatings
            .Include(er => er.Equipment)
            .ToListAsync();
    }

    [HttpGet("{equipmentId}")]
    public async Task<ActionResult<EquipmentRating>> GetEquipmentRating(int equipmentId)
    {
        var rating = await _context.EquipmentRatings
            .Include(er => er.Equipment)
            .FirstOrDefaultAsync(er => er.EquipmentId == equipmentId);

        if (rating == null)
            return NotFound();

        return rating;
    }

    [HttpPut("{equipmentId}")]
    public async Task<IActionResult> PutEquipmentRating(int equipmentId, EquipmentRating rating)
    {
        if (equipmentId != rating.EquipmentId)
            return BadRequest();

        _context.Entry(rating).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.EquipmentRatings.AnyAsync(er => er.EquipmentId == equipmentId))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpPost("rate")]
    public async Task<IActionResult> RateEquipment(int equipmentId, int rating)
    {
        if (rating < 1 || rating > 5)
            return BadRequest("Рейтинг должен быть от 1 до 5");

        // 1. Получаем ID текущего пользователя из токена
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("Пользователь не авторизован");

        int clientId = int.Parse(userId);

        // 2. Проверяем, что пользователь действительно арендовал эту технику и аренда завершена
        var hasCompletedRental = await _context.Rentals
            .AnyAsync(r => r.ClientId == clientId
                           && r.EquipmentId == equipmentId
                           && r.Status == "завершено");

        if (!hasCompletedRental)
            return BadRequest("Вы не можете оценить эту технику, так как у вас нет завершённой аренды.");

        // 3. Получаем или создаём запись рейтинга для данной техники
        var eqRating = await _context.EquipmentRatings.FindAsync(equipmentId);
        if (eqRating == null)
        {
            // Если записи нет, создаём новую
            eqRating = new EquipmentRating
            {
                EquipmentId = equipmentId,
                AvgRating = rating,
                RentalCount = 1
            };
            _context.EquipmentRatings.Add(eqRating);
        }
        else
        {
            // Обновляем средний рейтинг
            var total = eqRating.AvgRating * eqRating.RentalCount + rating;
            eqRating.RentalCount += 1;
            eqRating.AvgRating = total / eqRating.RentalCount;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Оценка сохранена", newAvg = eqRating.AvgRating });
    }


}