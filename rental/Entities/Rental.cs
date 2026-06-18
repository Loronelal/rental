using static System.Net.Mime.MediaTypeNames;

namespace rental.Entities
{
    public class Rental
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public int EquipmentId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalCost { get; set; }
        public string Status { get; set; } = "активно";

        public Client Client { get; set; } = null!;
        public Equipment Equipment { get; set; } = null!;

        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Damage> Damages { get; set; } = new List<Damage>();

    }
}
