namespace rental.Entities
{
    public class Maintenance
    {

        public int Id { get; set; }
        public int EquipmentId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Type { get; set; } = "плановое";
        public decimal Cost { get; set; }

        public Equipment Equipment { get; set; } = null!;

    }
}
