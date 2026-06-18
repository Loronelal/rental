using System.Collections.Generic;

namespace rental.Entities
{
    public class Client
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? PassportData { get; set; }

        // Навигационное свойство
        public ICollection<Rental> Rentals { get; set; } = new List<Rental>();
    }
}