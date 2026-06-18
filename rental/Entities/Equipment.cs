namespace rental.Entities
{
    public class Equipment
    {

        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TypeId { get; set; }
        public int Year { get; set; }
        public decimal HourlyRate { get; set; }
        public string Status { get; set; } = "доступен";

        // ВК
        public EquipmentType Type { get; set; } = null!;

        public ICollection<Rental> Rentals { get; set; } = new List<Rental>();
        public EquipmentRating? Rating { get; set; }
        public ICollection<Maintenance> Maintenances { get; set; } = new List<Maintenance>();

    }
}
