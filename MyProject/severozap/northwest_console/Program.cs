using System;
using System.Diagnostics;
using northwest;

namespace northwest_console
{
    class Program
    {
        static void Main(string[] args)
        {
            Trace.Listeners.Add(new TextWriterTraceListener("Log.txt"));
            Trace.AutoFlush = true;


            string input = "input.csv";
            string output = "output.csv";

            NorthwestCorner.Run(input, output);
            Console.WriteLine("Результат записан в " + output);
        }
    }
}
