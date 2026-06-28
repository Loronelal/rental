using rental.Entities;
using System.ComponentModel.DataAnnotations.Schema;

[Table("equipment")]
public class Equipment
{
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("type_id")]
    public int TypeId { get; set; }

    [Column("year")]
    public int Year { get; set; }

    [Column("hourly_rate")]
    public decimal HourlyRate { get; set; }

    [Column("status")]
    public string Status { get; set; } = "доступен";

    [Column("owner_id")]
    public int? OwnerId { get; set; }   // сделано nullable

    public Client? Owner { get; set; }   // nullable

    public EquipmentType? Type { get; set; } = null!;
    public ICollection<Rental> Rentals { get; set; } = new List<Rental>();
    public EquipmentRating? Rating { get; set; }
    public ICollection<Maintenance> Maintenances { get; set; } = new List<Maintenance>();
}