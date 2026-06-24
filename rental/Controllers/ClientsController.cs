using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Data;
using rental.Entities;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ClientsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ClientsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/clients
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Client>>> GetClients()
    {
        return await _context.Clients
            .Include(c => c.Rentals)
            .ToListAsync();
    }

    // GET: api/clients/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Client>> GetClient(int id)
    {
        var client = await _context.Clients
            .Include(c => c.Rentals)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
            return NotFound();

        return client;
    }

    // POST: api/clients
    [HttpPost]
    public async Task<ActionResult<Client>> PostClient(Client client)
    {
        _context.Clients.Add(client);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetClient), new { id = client.Id }, client);
    }

    // PUT: api/clients/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> PutClient(int id, Client client)
    {
        if (id != client.Id)
            return BadRequest();

        _context.Entry(client).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Clients.AnyAsync(c => c.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/clients/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClient(int id)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null)
            return NotFound();

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}