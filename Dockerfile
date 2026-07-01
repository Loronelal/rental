FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем всё содержимое репозитория (включая папки rental, rental.AppHost, rental.ServiceDefaults)
COPY . .

# Восстанавливаем зависимости для всего решения
RUN dotnet restore

# Публикуем основной проект (rental/rental.csproj)
RUN dotnet publish rental/rental.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Копируем собранное приложение (включая wwwroot)
COPY --from=build /app/publish .

EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "rental.dll"]