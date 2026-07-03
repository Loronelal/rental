using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace dijkstra
{
    public class Dijkstra
    {
        public static int[] Dijkst(int[,] graf, int nachalo)
        {
            int razmer = graf.GetLength(0);
            Trace.TraceInformation("Размер {0}x{0}, начало в ={1}", razmer, nachalo);
            int[] rasst = new int[razmer];
            bool[] posesh = new bool[razmer];
            const int BESK = int.MaxValue;

            for (int i = 0; i < razmer; i++) rasst[i] = BESK;
            rasst[nachalo] = 0;

            for (int i = 0; i < razmer; i++)
            {
                int tek = -1;
                for (int j = 0; j < razmer; j++)
                    if (!posesh[j] && (tek == -1 || rasst[j] < rasst[tek]))
                        tek = j;

                if (rasst[tek] == BESK) break;
                posesh[tek] = true;
                Debug.WriteLine("Посещена вершина {0}, расстояние={1}", tek, rasst[tek]);

                for (int sosed = 0; sosed < razmer; sosed++)
                {
                    int ves = graf[tek, sosed];
                    if (ves > 0 && rasst[tek] + ves < rasst[sosed])
                    {
                        rasst[sosed] = rasst[tek] + ves;
                        Debug.WriteLine("Уменьшение расстояния {0}->{1}, новое расстояние ={2}", tek, sosed, rasst[sosed]);
                    }
                }
            }
            Trace.TraceInformation("Завершено");
            return rasst;
        }

        public static void Run(string inputFile, string outputFile)
        {
            Trace.TraceInformation("Чтение файла {0}", inputFile);
            var stroki = File.ReadAllLines(inputFile);
            int razmer = int.Parse(stroki[0].Trim());
            int[,] graf = new int[razmer, razmer];

            for (int i = 0; i < razmer; i++)
            {
                var chasti = stroki[i + 1].Split(',');
                for (int j = 0; j < razmer; j++)
                    graf[i, j] = int.Parse(chasti[j].Trim());
            }

            int nachalo = 0;
            int[] rasst = Dijkst(graf, nachalo);

            using (var sw = new StreamWriter(outputFile))
            {
                sw.WriteLine("Вершина, Расстояние");
                for (int i = 0; i < razmer; i++)
                {
                    if (rasst[i] == int.MaxValue)
                        sw.WriteLine("{0}, нет пути", i);
                    else
                        sw.WriteLine("{0},{1}", i, rasst[i]);
                }
            }
            Trace.TraceInformation("Запись в файл {0}", outputFile);
        }
    }
}