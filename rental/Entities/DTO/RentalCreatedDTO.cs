namespace rental.Entities
{
    public class RentalCreateDto
    {
        public int? ClientId { get; set; }   // для админа
        public int EquipmentId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}