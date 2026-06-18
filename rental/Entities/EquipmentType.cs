namespace rental.Entities
{
    public class EquipmentType
    {

        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<Equipment> EquipmentItems { get; set; } = new List<Equipment>();

    }
}
