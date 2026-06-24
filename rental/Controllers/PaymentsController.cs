using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Entities;
using rental.Data;

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
        var revenue = await _context.Payments
            .Where(p => p.PaymentDate >= start && p.PaymentDate <= end)
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


    [HttpPost]
    public async Task<ActionResult<Payment>> PostPayment(Payment payment)
    {
        var rentalExists = await _context.Rentals.AnyAsync(r => r.Id == payment.RentalId);
        if (!rentalExists)
            return BadRequest("Бронирование не найдено");

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