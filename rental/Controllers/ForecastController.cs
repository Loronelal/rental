using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using rental.Data;
using rental.Entities;

namespace rental.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ForecastController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ForecastController(ApplicationDbContext context)
    {
        _context = context;
    }

    // =============================================
    // Прогноз по модели Хольта-Уинтерса
    // =============================================
    [HttpGet("holt-winters")]
    public async Task<ActionResult<IEnumerable<DailyForecast>>> GetHoltWintersForecast(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? equipmentTypeId = null,
        [FromQuery] double alpha = 0.3,
        [FromQuery] double beta = 0.1,
        [FromQuery] double gamma = 0.3)
    {
        startDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        endDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

        var historyStart = startDate.AddDays(-180);
        var historyEnd = startDate;

        var query = _context.Rentals
            .Where(r => r.StartDate >= historyStart && r.StartDate < historyEnd && r.Status == "завершено");

        if (equipmentTypeId.HasValue)
        {
            query = query.Where(r => r.Equipment.TypeId == equipmentTypeId.Value);
        }

        var rentals = await query
            .Select(r => r.StartDate)
            .ToListAsync();

        var dayCount = (historyEnd - historyStart).Days;
        var dailyCounts = new double[dayCount];
        var grouped = rentals.GroupBy(d => (d - historyStart).Days)
                             .ToDictionary(g => g.Key, g => g.Count());

        for (int i = 0; i < dayCount; i++)
        {
            dailyCounts[i] = grouped.ContainsKey(i) ? grouped[i] : 0;
        }

        if (dailyCounts.Length < 14)
        {
            return BadRequest("Недостаточно данных (нужно минимум 14 дней).");
        }

        var forecastSteps = (int)(endDate - startDate).TotalDays + 1;
        var forecast = HoltWinters(dailyCounts, 7, alpha, beta, gamma, forecastSteps);

        var result = new List<DailyForecast>();
        for (int i = 0; i < forecastSteps; i++)
        {
            result.Add(new DailyForecast
            {
                Date = startDate.AddDays(i),
                PredictedRentals = Math.Round(forecast[i], 2)
            });
        }

        return Ok(result);
    }

    // =============================================
    // Простой прогноз по дням недели (для сравнения)
    // =============================================
    [HttpGet("simple")]
    public async Task<ActionResult<IEnumerable<DailyForecast>>> GetSimpleForecast(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? equipmentTypeId = null)
    {
        startDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        endDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

        var historyStart = startDate.AddDays(-90);
        var historyEnd = startDate;

        var query = _context.Rentals
            .Where(r => r.StartDate >= historyStart && r.StartDate < historyEnd && r.Status == "завершено");

        if (equipmentTypeId.HasValue)
        {
            query = query.Where(r => r.Equipment.TypeId == equipmentTypeId.Value);
        }

        var historicalRentals = await query
            .Select(r => new { r.StartDate })
            .ToListAsync();

        if (!historicalRentals.Any())
        {
            return BadRequest("Нет данных за последние 90 дней.");
        }

        var dayOfWeekGroups = historicalRentals
            .GroupBy(r => (int)r.StartDate.DayOfWeek)
            .Select(g => new { DayOfWeek = g.Key, Count = g.Count() })
            .ToDictionary(g => g.DayOfWeek, g => g.Count);

        var totalDays = (historyEnd - historyStart).TotalDays;
        var avgPerDayOfWeek = dayOfWeekGroups.ToDictionary(
            kv => kv.Key,
            kv => kv.Value / (totalDays / 7.0)
        );

        var result = new List<DailyForecast>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var dow = (int)date.DayOfWeek;
            var predicted = avgPerDayOfWeek.ContainsKey(dow) ? avgPerDayOfWeek[dow] : 0;
            result.Add(new DailyForecast
            {
                Date = date,
                PredictedRentals = Math.Round(predicted, 2)
            });
        }

        return Ok(result);
    }

    // =============================================
    // Популярная техника
    // =============================================
    [HttpGet("equipment/popular")]
    public async Task<ActionResult<IEnumerable<PopularEquipment>>> GetPopularEquipment([FromQuery] int days = 30)
    {
        var cutoff = DateTime.UtcNow.AddDays(-days);
        var popular = await _context.Rentals
            .Where(r => r.StartDate >= cutoff && r.Status == "завершено")
            .GroupBy(r => r.EquipmentId)
            .Select(g => new PopularEquipment
            {
                EquipmentId = g.Key,
                EquipmentName = g.First().Equipment.Name,
                RentalCount = g.Count()
            })
            .OrderByDescending(e => e.RentalCount)
            .Take(10)
            .ToListAsync();

        return Ok(popular);
    }

    // =============================================
    // Реализация модели Хольта-Уинтерса (аддитивная)
    // =============================================
    private double[] HoltWinters(double[] y, int seasonLength, double alpha, double beta, double gamma, int forecastSteps)
    {
        int n = y.Length;
        if (n < seasonLength * 2)
            throw new ArgumentException("Недостаточно данных для обучения модели.");

        double[] level = new double[n];
        double[] trend = new double[n];
        double[] season = new double[seasonLength];
        double[] forecast = new double[forecastSteps];

        double initialAvg = Average(y, 0, seasonLength);
        for (int i = 0; i < seasonLength; i++)
        {
            season[i] = y[i] - initialAvg;
        }

        level[seasonLength - 1] = initialAvg;
        trend[seasonLength - 1] = (Average(y, seasonLength, seasonLength) - Average(y, 0, seasonLength)) / seasonLength;

        for (int t = seasonLength; t < n; t++)
        {
            level[t] = alpha * (y[t] - season[t % seasonLength]) + (1 - alpha) * (level[t - 1] + trend[t - 1]);
            trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1];
            season[t % seasonLength] = gamma * (y[t] - level[t]) + (1 - gamma) * season[t % seasonLength];
        }

        for (int h = 0; h < forecastSteps; h++)
        {
            forecast[h] = level[n - 1] + (h + 1) * trend[n - 1] + season[(n + h) % seasonLength];
            if (forecast[h] < 0) forecast[h] = 0;
        }

        return forecast;
    }

    private double Average(double[] array, int start, int count)
    {
        double sum = 0;
        for (int i = start; i < start + count && i < array.Length; i++)
            sum += array[i];
        return sum / count;
    }



// GET: api/forecast/monthly
[HttpGet("monthly")]
    public async Task<ActionResult<IEnumerable<DailyForecast>>> GetMonthlyAverageForecast(
    [FromQuery] DateTime startDate,
    [FromQuery] DateTime endDate,
    [FromQuery] int? equipmentTypeId = null)
    {
        startDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        endDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

        // Берём историю за последние 2 года (чтобы сгладить случайности)
        var historyStart = startDate.AddYears(-2);
        var historyEnd = startDate;

        var query = _context.Rentals
            .Where(r => r.StartDate >= historyStart && r.StartDate < historyEnd && r.Status == "завершено");

        if (equipmentTypeId.HasValue)
            query = query.Where(r => r.Equipment.TypeId == equipmentTypeId.Value);

        var rentals = await query
            .Select(r => r.StartDate)
            .ToListAsync();

        // Группируем по месяцу (1-12) и считаем среднее количество аренд в день
        var monthlyAvg = rentals
            .GroupBy(d => d.Month)
            .Select(g => new { Month = g.Key, CountPerDay = (double)g.Count() / 30.0 }) // примерное среднее в день
            .ToDictionary(x => x.Month, x => x.CountPerDay);

        // Заполняем пропущенные месяцы нулями
        for (int m = 1; m <= 12; m++)
            if (!monthlyAvg.ContainsKey(m)) monthlyAvg[m] = 0;

        var result = new List<DailyForecast>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var predicted = monthlyAvg.ContainsKey(date.Month) ? monthlyAvg[date.Month] : 0;
            result.Add(new DailyForecast
            {
                Date = date,
                PredictedRentals = Math.Round(predicted, 2)
            });
        }

        return Ok(result);
    }
}
// DTO
public class DailyForecast
{
    public DateTime Date { get; set; }
    public double PredictedRentals { get; set; }
}

public class PopularEquipment
{
    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = string.Empty;
    public int RentalCount { get; set; }
}