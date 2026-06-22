using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

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
}