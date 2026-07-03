using System;
using System.Diagnostics;
using dijkstra;

namespace dijkstra_console
{
    class Program
    {
        static void Main(string[] args)
        {
            Trace.Listeners.Add(new TextWriterTraceListener("Log.txt"));
            Trace.AutoFlush = true;


            string input = "vhod.csv";
            string output = "result.csv";

            Dijkstra.Run(input, output);
            Console.WriteLine("Результат записан в файл " + output);
        }
    }
}
