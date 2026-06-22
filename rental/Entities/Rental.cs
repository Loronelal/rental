using rental.Entities;
using System.ComponentModel.DataAnnotations.Schema;

[Table("rentals")]
public class Rental
{
    [Column("id")]
    public int Id { get; set; }

    [Column("client_id")]
    public int ClientId { get; set; }

    [Column("equipment_id")]
    public int EquipmentId { get; set; }

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    public DateTime EndDate { get; set; }

    [Column("total_cost")]  
    public decimal TotalCost { get; set; }

    [Column("status")]
    public string Status { get; set; } = "активно";

    public Client Client { get; set; } = null!;
    public Equipment Equipment { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Damage> Damages { get; set; } = new List<Damage>();
}