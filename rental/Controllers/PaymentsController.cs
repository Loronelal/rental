using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Data;
using rental.Entities;
using System.Security.Claims;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PaymentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Payment>>> GetPayments()
    {
        return await _context.Payments
            .Include(p => p.Rental)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Payment>> GetPayment(int id)
    {
        var payment = await _context.Payments
            .Include(p => p.Rental)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payment == null)
            return NotFound();

        return payment;
    }


    [HttpGet("revenue")]
    public async Task<ActionResult> GetRevenue([FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        // Принудительно переводим в UTC
        DateTime startUtc = DateTime.SpecifyKind(start, DateTimeKind.Utc);
        DateTime endUtc = DateTime.SpecifyKind(end, DateTimeKind.Utc);

        var revenue = await _context.Payments
            .Where(p => p.PaymentDate >= startUtc && p.PaymentDate <= endUtc)
            .Join(_context.Rentals, p => p.RentalId, r => r.Id, (p, r) => new { p, r })
            .Join(_context.Equipment, pr => pr.r.EquipmentId, e => e.Id, (pr, e) => new { pr.p, pr.r, e })
            .Join(_context.EquipmentTypes, pre => pre.e.TypeId, t => t.Id, (pre, t) => new { pre.p, pre.r, pre.e, t })
            .GroupBy(x => x.t.Name)
            .Select(g => new
            {
                Type = g.Key,
                Total = g.Sum(x => x.p.Amount)
            })
            .ToListAsync();
        return Ok(revenue);
    }


    // GET: api/payments/revenue/my
    [HttpGet("revenue/my")]
    [Authorize]
    public async Task<ActionResult> GetMyRevenue(
        [FromQuery] DateTime start,
        [FromQuery] DateTime end,
        [FromQuery] string groupBy = "type") // "type" или "equipment"
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        int clientId = int.Parse(userId);

        DateTime startUtc = DateTime.SpecifyKind(start, DateTimeKind.Utc);
        DateTime endUtc = DateTime.SpecifyKind(end, DateTimeKind.Utc);

        // Платежи за период, привязанные к арендам, где владелец техники = текущий пользователь
        var query = _context.Payments
            .Where(p => p.PaymentDate >= startUtc && p.PaymentDate <= endUtc)
            .Join(_context.Rentals, p => p.RentalId, r => r.Id, (p, r) => new { p, r })
            .Where(pr => pr.r.Equipment.OwnerId == clientId);

        if (groupBy == "equipment")
        {
            // Группировка по каждой единице техники
            var result = await query
                .GroupBy(pr => new { pr.r.Equipment.Id, pr.r.Equipment.Name })
                .Select(g => new
                {
                    EquipmentId = g.Key.Id,
                    EquipmentName = g.Key.Name,
                    Total = g.Sum(x => x.p.Amount)
                })
                .OrderByDescending(x => x.Total)
                .ToListAsync();
            return Ok(result);
        }
        else
        {
            // Группировка по типам техники (по умолчанию)
            var result = await query
                .Join(_context.EquipmentTypes, pr => pr.r.Equipment.TypeId, t => t.Id, (pr, t) => new { pr, t })
                .GroupBy(x => x.t.Name)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(x => x.pr.p.Amount)
                })
                .ToListAsync();
            return Ok(result);
        }
    }

    [HttpPost]
    public async Task<ActionResult<Payment>> PostPayment(Payment payment)
    {
        var rental = await _context.Rentals
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(r => r.Id == payment.RentalId);
        if (rental == null)
            return BadRequest("Бронирование не найдено");

        if (rental.Status == "отменено")
            return BadRequest("Нельзя оплатить отменённое бронирование");

        if (rental.Status != "активно")
            return BadRequest("Можно оплачивать только активные бронирования");

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutPayment(int id, Payment payment)
    {
        if (id != payment.Id)
            return BadRequest();

        _context.Entry(payment).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Payments.AnyAsync(p => p.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePayment(int id)
    {
        var payment = await _context.Payments.FindAsync(id);
        if (payment == null)
            return NotFound();

        _context.Payments.Remove(payment);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}