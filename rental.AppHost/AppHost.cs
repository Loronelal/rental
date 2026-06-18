var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.rental>("rental");

builder.Build().Run();
