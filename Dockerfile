# Базовый образ для сборки
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем csproj из подпапки rental/
COPY ["rental/rental.csproj", "./"]
COPY rental/ .   # вместо COPY . .
RUN dotnet restore

# Копируем все остальные файлы из подпапки rental/
COPY rental/ .

RUN dotnet publish -c Release -o /app/publish

# Базовый образ для выполнения
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Копируем собранное приложение
COPY --from=build /app/publish .

# Копируем статические файлы (HTML, CSS, JS) – они тоже лежат в rental/
COPY rental/*.html ./
COPY rental/*.css ./
COPY rental/*.js ./
COPY rental/images ./images

EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "rental.dll"]