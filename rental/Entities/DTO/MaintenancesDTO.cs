namespace rental.Entities
{
    public class MaintenanceCreateDto
    {
        public int EquipmentId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Type { get; set; } = "плановое";
        public decimal Cost { get; set; }
    }

    public class MaintenanceUpdateDto : MaintenanceCreateDto
    {
        public int Id { get; set; }
    }

    public class MaintenanceDto : MaintenanceUpdateDto
    {
        public string? EquipmentName { get; set; }
    }
}