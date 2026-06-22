using System.ComponentModel.DataAnnotations.Schema;

[Table("maintenance")]
public class Maintenance
{
    [Column("id")]
    public int Id { get; set; }

    [Column("equipment_id")]
    public int EquipmentId { get; set; }

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    public DateTime EndDate { get; set; }

    [Column("type")]
    public string Type { get; set; } = "плановое";

    [Column("cost")]
    public decimal Cost { get; set; }

    public Equipment Equipment { get; set; } = null!;
}