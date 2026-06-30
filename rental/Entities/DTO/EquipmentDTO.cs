namespace rental.Entities
{
    public class EquipmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TypeName { get; set; } = string.Empty;
        public string? TypeImageUrl { get; set; }
        public int TypeId { get; set; }
        public int Year { get; set; }
        public decimal HourlyRate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal AvgRating { get; set; }
        public int RentalCount { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public int? OwnerId { get; set; }
        public DateTime? LastMaintenanceDate { get; set; }  // новое поле
    }
}