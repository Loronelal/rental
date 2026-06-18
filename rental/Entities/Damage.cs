namespace rental.Entities
{
    public class Damage
    {

        public int Id { get; set; }
        public int RentalId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal RepairCost { get; set; }
        public string Status { get; set; } = "зафиксировано";

        public Rental Rental { get; set; } = null!;


    }
}
