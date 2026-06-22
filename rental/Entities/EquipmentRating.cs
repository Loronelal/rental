using System.ComponentModel.DataAnnotations.Schema;

[Table("equipmentratings")]  
public class EquipmentRating
{
    [Column("equipment_id")]
    public int EquipmentId { get; set; }

    [Column("avg_rating")]
    public decimal AvgRating { get; set; }

    [Column("rental_count")]
    public int RentalCount { get; set; }

    public Equipment Equipment { get; set; } = null!;
}