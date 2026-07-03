using System;
using System.Diagnostics;
using System.IO;

namespace northwest
{
    public class NorthwestCorner
    {
        public static int[,] SevZap(int[] supply, int[] demand, int[,] cost, out int totalCost)
        {
            int postavshiki = supply.Length;
            int potrebiteli = demand.Length;
            Trace.TraceInformation("решение задачи {0}x{1}", postavshiki, potrebiteli);

            int[,] plan = new int[postavshiki, potrebiteli];
            int[] ostPostav = (int[])supply.Clone();
            int[] ostPotreb = (int[])demand.Clone();
            totalCost = 0;
            int i = 0, j = 0;

            while (i < postavshiki && j < potrebiteli)
            {
                int obem = Math.Min(ostPostav[i], ostPotreb[j]);
                plan[i, j] = obem;
                ostPostav[i] -= obem;
                ostPotreb[j] -= obem;
                totalCost += obem * cost[i, j];

                Debug.WriteLine("клетка [{0},{1}] = {2}, стоимость={3}, общая={4}",
                    i, j, obem, cost[i, j], totalCost);

                if (ostPostav[i] == 0) i++;
                if (ostPotreb[j] == 0) j++;
            }

            Trace.TraceInformation("общая стоимость = {0}", totalCost);
            return plan;
        }

        public static void Run(string inputFile, string outputFile)
        {
            Trace.TraceInformation("чтение файла {0}", inputFile);
            string[] stroki = File.ReadAllLines(inputFile);
            int ukaz = 0;

            int postavshiki = int.Parse(stroki[ukaz++].Trim());
            int potrebiteli = int.Parse(stroki[ukaz++].Trim());

            int[] zapasy = new int[postavshiki];
            string[] chastZapas = stroki[ukaz++].Split(',');
            for (int i = 0; i < postavshiki; i++)
                zapasy[i] = int.Parse(chastZapas[i].Trim());

            int[] potrebnosti = new int[potrebiteli];
            string[] chastPotreb = stroki[ukaz++].Split(',');
            for (int j = 0; j < potrebiteli; j++)
                potrebnosti[j] = int.Parse(chastPotreb[j].Trim());

            int[,] stoimosti = new int[postavshiki, potrebiteli];
            for (int i = 0; i < postavshiki; i++)
            {
                string[] chasti = stroki[ukaz++].Split(',');
                for (int j = 0; j < potrebiteli; j++)
                    stoimosti[i, j] = int.Parse(chasti[j].Trim());
            }

            int obshStoim;
            int[,] plan = SevZap(zapasy, potrebnosti, stoimosti, out obshStoim);

            using (var sw = new StreamWriter(outputFile))
            {
                sw.WriteLine("Row,Col,Value");
                for (int i = 0; i < postavshiki; i++)
                    for (int j = 0; j < potrebiteli; j++)
                        if (plan[i, j] > 0)
                            sw.WriteLine("{0},{1},{2}", i, j, plan[i, j]);
                sw.WriteLine("Общая стоимость,{0}", obshStoim);
            }

            Trace.TraceInformation("результат записан в {0}", outputFile);
        }
    }
}