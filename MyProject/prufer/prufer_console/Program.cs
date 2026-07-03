using prufer;
using System;
using System.Diagnostics;

namespace prufer_console
{
    class Program
    {
        static void Main(string[] args)
        {
            Trace.Listeners.Add(new TextWriterTraceListener("Log.txt"));
            Trace.AutoFlush = true;


            string input = "input.csv";
            string output = "output.csv";

            Prufer.Run(input, output);
            Console.WriteLine("Записано в " + output);
        }
    }
}
