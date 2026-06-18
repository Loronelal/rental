namespace rental.Entities
{
    public class EquipmentRating
    {
        public int EquipmentId { get; set; }
        public decimal AvgRating { get; set; }
        public int RentalCount { get; set; }

        public Equipment Equipment { get; set; } = null!;

    }
}
