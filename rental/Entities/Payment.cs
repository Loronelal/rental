namespace rental.Entities
{
    public class Payment
    {
        public int Id { get; set; }
        public int RentalId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string Method { get; set; } = "карта";

        public Rental Rental { get; set; } = null!;

    }
}
