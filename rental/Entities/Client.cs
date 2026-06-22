using System.ComponentModel.DataAnnotations.Schema;

namespace rental.Entities
{
    [Table("clients")]
    public class Client
    {
        [Column("id")]
        public int Id { get; set; }

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("phone")]
        public string Phone { get; set; } = string.Empty;

        [Column("email")]
        public string? Email { get; set; }

        [Column("passport_data")]
        public string? PassportData { get; set; }

        public ICollection<Rental> Rentals { get; set; } = new List<Rental>();
    }
}