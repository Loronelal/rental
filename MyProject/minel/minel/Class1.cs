using System;
using System.Diagnostics;
using System.IO;

namespace minel
{
    public class MinElement
    {

        public static int[,] MinEl(int[] supply, int[] demand, int[,] cost, out int totalCost)
        {
            int postavshiki = supply.Length;      // количество поставщиков
            int potrebiteli = demand.Length;     // количество потребителей
            Trace.TraceInformation("MinElement: решение транспортной задачи {0}x{1}", postavshiki, potrebiteli);

            int[,] perevozki = new int[postavshiki, potrebiteli];
            int[] ostatkiPostav = (int[])supply.Clone();   // остатки запасов
            int[] ostatkiPotreb = (int[])demand.Clone();   // остатки потребностей
            bool[] ispolzPostav = new bool[postavshiki];   // использован ли поставщик
            bool[] ispolzPotreb = new bool[potrebiteli];   // использован ли потребитель
            totalCost = 0;

            while (true)
            {
                int minStoim = int.MaxValue;
                int stroka = -1;
                int stolbec = -1;

                // Поиск клетки с минимальной стоимостью среди неиспользованных
                for (int i = 0; i < postavshiki; i++)
                    if (!ispolzPostav[i])
                        for (int j = 0; j < potrebiteli; j++)
                            if (!ispolzPotreb[j] && cost[i, j] < minStoim)
                            {
                                minStoim = cost[i, j];
                                stroka = i;
                                stolbec = j;
                            }

                if (stroka == -1) break; // все клетки заполнены

                // Определяем объём перевозки
                int obem = Math.Min(ostatkiPostav[stroka], ostatkiPotreb[stolbec]);
                perevozki[stroka, stolbec] = obem;
                ostatkiPostav[stroka] -= obem;
                ostatkiPotreb[stolbec] -= obem;
                totalCost += obem * cost[stroka, stolbec];

                Debug.WriteLine("клетка [{0},{1}] = {2}, стоимость={3}, общая={4}",
                    stroka, stolbec, obem, cost[stroka, stolbec], totalCost);

                // Если запасы или потребности исчерпаны – помечаем строку/столбец как использованные
                if (ostatkiPostav[stroka] == 0) ispolzPostav[stroka] = true;
                if (ostatkiPotreb[stolbec] == 0) ispolzPotreb[stolbec] = true;
            }

            Trace.TraceInformation("общая стоимость = {0}", totalCost);
            return perevozki;
        }

        public static void Run(string inputFile, string outputFile)
        {
            Trace.TraceInformation("чтение файла {0}", inputFile);
            string[] stroki = File.ReadAllLines(inputFile);
            int ukazatel = 0;

            int postavshiki = int.Parse(stroki[ukazatel++].Trim());
            int potrebiteli = int.Parse(stroki[ukazatel++].Trim());

            // Запасы поставщиков
            int[] zapasy = new int[postavshiki];
            string[] chastZapas = stroki[ukazatel++].Split(',');
            for (int i = 0; i < postavshiki; i++)
                zapasy[i] = int.Parse(chastZapas[i].Trim());

            // Потребности потребителей
            int[] potrebnosti = new int[potrebiteli];
            string[] chastPotreb = stroki[ukazatel++].Split(',');
            for (int j = 0; j < potrebiteli; j++)
                potrebnosti[j] = int.Parse(chastPotreb[j].Trim());

            // Матрица стоимостей
            int[,] stoimosti = new int[postavshiki, potrebiteli];
            for (int i = 0; i < postavshiki; i++)
            {
                string[] chastStoim = stroki[ukazatel++].Split(',');
                for (int j = 0; j < potrebiteli; j++)
                    stoimosti[i, j] = int.Parse(chastStoim[j].Trim());
            }

            int obshStoim;
            int[,] reshenie = MinEl(zapasy, potrebnosti, stoimosti, out obshStoim);

            // Запись результата
            using (var sw = new StreamWriter(outputFile))
            {
                sw.WriteLine("Row,Col,Value");
                for (int i = 0; i < postavshiki; i++)
                    for (int j = 0; j < potrebiteli; j++)
                        if (reshenie[i, j] > 0)
                            sw.WriteLine("{0},{1},{2}", i, j, reshenie[i, j]);
                sw.WriteLine("TotalCost,{0}", obshStoim);
            }
            Trace.TraceInformation("MinElement: результат записан в {0}", outputFile);
        }
    }
}