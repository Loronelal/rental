using rental.Entities;
using System.ComponentModel.DataAnnotations.Schema;

[Table("equipmenttypes")]
public class EquipmentType
{
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    public ICollection<Equipment> EquipmentItems { get; set; } = new List<Equipment>();
}