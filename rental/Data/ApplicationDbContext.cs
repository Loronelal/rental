using Microsoft.EntityFrameworkCore;
using rental.Entities;


namespace rental.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Client> Clients { get; set; }
    public DbSet<EquipmentType> EquipmentTypes { get; set; }
    public DbSet<Equipment> Equipment { get; set; }
    public DbSet<Rental> Rentals { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Maintenance> Maintenances { get; set; }
    public DbSet<Damage> Damages { get; set; }
    public DbSet<EquipmentRating> EquipmentRatings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Настройка связи Equipment → EquipmentType (многие-к-одному)
        modelBuilder.Entity<Equipment>()
            .HasOne(e => e.Type)
            .WithMany(t => t.EquipmentItems)
            .HasForeignKey(e => e.TypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Настройка связи Rental → Client (многие-к-одному)
        modelBuilder.Entity<Rental>()
            .HasOne(r => r.Client)
            .WithMany(c => c.Rentals)
            .HasForeignKey(r => r.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        // Настройка связи Rental → Equipment (многие-к-одному)
        modelBuilder.Entity<Rental>()
            .HasOne(r => r.Equipment)
            .WithMany(e => e.Rentals)
            .HasForeignKey(r => r.EquipmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Настройка связи Payment → Rental (один-ко-многим)
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Rental)
            .WithMany(r => r.Payments)
            .HasForeignKey(p => p.RentalId)
            .OnDelete(DeleteBehavior.Cascade);

        // Настройка связи Damage → Rental (один-ко-многим)
        modelBuilder.Entity<Damage>()
            .HasOne(d => d.Rental)
            .WithMany(r => r.Damages)
            .HasForeignKey(d => d.RentalId)
            .OnDelete(DeleteBehavior.Cascade);

        // Настройка связи Maintenance → Equipment (многие-к-одному)
        modelBuilder.Entity<Maintenance>()
            .HasOne(m => m.Equipment)
            .WithMany(e => e.Maintenances)
            .HasForeignKey(m => m.EquipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Настройка связи EquipmentRating → Equipment (один-к-одному)
        modelBuilder.Entity<EquipmentRating>()
            .HasKey(er => er.EquipmentId);
        modelBuilder.Entity<EquipmentRating>()
            .HasOne(er => er.Equipment)
            .WithOne(e => e.Rating)
            .HasForeignKey<EquipmentRating>(er => er.EquipmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}