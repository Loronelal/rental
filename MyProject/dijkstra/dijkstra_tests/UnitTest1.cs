using Microsoft.VisualStudio.TestTools.UnitTesting;
using dijkstra;

namespace dijkstra_tests
{
    [TestClass]
    public class DijkstraTests
    {
        [TestMethod]
        public void Dijkstra_Four_Na_Four_Graph()
        {
            int[,] graph = {
                { 0, 2, 5, 0 },
                { 2, 0, 1, 3 },
                { 5, 1, 0, 0 },
                { 0, 3, 0, 0 }
            };
            int[] rasst = Dijkstra.Dijkst(graph, 0);
            Assert.AreEqual(0, rasst[0]);
            Assert.AreEqual(2, rasst[1]);
            Assert.AreEqual(3, rasst[2]);
            Assert.AreEqual(5, rasst[3]);
        }

        [TestMethod]
        public void Dijkstra_Odna_Vershina_Izolirovana()
        {
            int[,] graph = {
                { 0, 0, 3 },
                { 0, 0, 0 },
                { 3, 0, 0 }
            };
            int[] rasst = Dijkstra.Dijkst(graph, 0);
            Assert.AreEqual(0, rasst[0]);
            Assert.AreEqual(int.MaxValue, rasst[1]);
            Assert.AreEqual(3, rasst[2]);
        }

        [TestMethod]
        public void Dijkstra_Odna_Vershina()
        {
            int[,] graph = { { 0 } };
            int[] rasst = Dijkstra.Dijkst(graph, 0);
            Assert.AreEqual(0, rasst[0]);
        }


        [TestMethod]
        public void Dijkstra_Polnyi_Graph()
        {
            int[,] graph = {
                { 0, 1, 3 },
                { 1, 0, 1 },
                { 3, 1, 0 }
            };
            int[] rasst = Dijkstra.Dijkst(graph, 0);
            Assert.AreEqual(0, rasst[0]);
            Assert.AreEqual(1, rasst[1]);
            Assert.AreEqual(2, rasst[2]);
        }

        [TestMethod]
        public void Dijkstra_Alternativnye_Puti()
        {

            int[,] graph = {
                { 0, 2, 0, 1 },
                { 2, 0, 3, 0 },
                { 0, 3, 0, 1 },
                { 1, 0, 1, 0 }
            };
            int[] rasst = Dijkstra.Dijkst(graph, 0);
            Assert.AreEqual(0, rasst[0]);
            Assert.AreEqual(2, rasst[1]);
            Assert.AreEqual(2, rasst[2]);
            Assert.AreEqual(1, rasst[3]);
        }
    }
}