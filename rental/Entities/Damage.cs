using System.ComponentModel.DataAnnotations.Schema;

[Table("damages")]
public class Damage
{
    [Column("id")]
    public int Id { get; set; }

    [Column("rental_id")]
    public int RentalId { get; set; }

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("repair_cost")]
    public decimal RepairCost { get; set; }

    [Column("status")]
    public string Status { get; set; } = "зафиксировано";

    public Rental Rental { get; set; } = null!;
}