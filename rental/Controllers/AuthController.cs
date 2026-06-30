using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using rental.Data;
using rental.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public AuthController(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (await _context.Clients.AnyAsync(c => c.Username == dto.Username))
            return BadRequest("Имя пользователя уже занято");

        var client = new Client
        {
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Name = dto.Name,
            Phone = dto.Phone,
            Email = dto.Email,
            Role = "User"
        };

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();
        return Ok("Пользователь зарегистрирован");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Username == dto.Username);

        if (client == null || !BCrypt.Net.BCrypt.Verify(dto.Password, client.PasswordHash))
            return Unauthorized("Неверное имя или пароль");

        var token = GenerateJwtToken(client);
        return Ok(new { token, clientId = client.Id, role = client.Role, name = client.Name });
    }

    private string GenerateJwtToken(Client client)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, client.Id.ToString()),
            new Claim(ClaimTypes.Name, client.Username),
            new Claim(ClaimTypes.Role, client.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}