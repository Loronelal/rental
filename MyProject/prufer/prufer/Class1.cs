using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

namespace prufer
{
    public class Prufer
    {
        public static int[] Pruferr(List<KeyValuePair<int, int>> edges, int n)
        {
            Trace.TraceInformation("кодирование дерева с {0} вершинами, {1} рёбрами", n, edges.Count);

            int[] stepeni = new int[n];
            int[] kod = new int[n - 2];

            foreach (var rebro in edges)
            {
                stepeni[rebro.Key]++;
                stepeni[rebro.Value]++;
            }

            for (int shag = 0; shag < n - 2; shag++)
            {
                int list = -1;
                for (int i = 0; i < n; i++)
                    if (stepeni[i] == 1 && (list == -1 || i < list))
                        list = i;

                int sosed = -1;
                foreach (var rebro in edges)
                {
                    if (rebro.Key == list) { sosed = rebro.Value; break; }
                    if (rebro.Value == list) { sosed = rebro.Key; break; }
                }

                kod[shag] = sosed;
                stepeni[list]--;
                stepeni[sosed]--;
                Debug.WriteLine("шаг {0}, лист={1}, сосед={2}", shag, list, sosed);
            }
            Trace.TraceInformation("код = [{0}]", string.Join(",", kod));
            return kod;
        }

        public static void Run(string inputFile, string outputFile)
        {
            Trace.TraceInformation("чтение {0}", inputFile);
            string[] stroki = File.ReadAllLines(inputFile);
            int razmer = int.Parse(stroki[0].Trim());
            int kolichestvoRebr = int.Parse(stroki[1].Trim());
            var rebra = new List<KeyValuePair<int, int>>();

            for (int i = 0; i < kolichestvoRebr; i++)
            {
                string[] chasti = stroki[i + 2].Split(',');
                rebra.Add(new KeyValuePair<int, int>(int.Parse(chasti[0].Trim()), int.Parse(chasti[1].Trim())));
            }

            int[] kod = Pruferr(rebra, razmer);
            using (var writer = new StreamWriter(outputFile))
            {
                writer.WriteLine("Код прюфера");
                writer.WriteLine(string.Join(",", kod));
            }
            Trace.TraceInformation("запись в {0}", outputFile);
        }
    }
}