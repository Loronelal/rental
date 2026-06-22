using System.ComponentModel.DataAnnotations.Schema;

[Table("payments")]
public class Payment
{
    [Column("id")]
    public int Id { get; set; }

    [Column("rental_id")]
    public int RentalId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("payment_date")]
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [Column("method")]
    public string Method { get; set; } = "карта";

    public Rental Rental { get; set; } = null!;
}