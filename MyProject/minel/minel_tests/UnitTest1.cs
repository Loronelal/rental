using Microsoft.VisualStudio.TestTools.UnitTesting;
using minel;

namespace minel_tests
{
    [TestClass]
    public class MinElementTests
    {
        [TestMethod]
        public void MinElement_Three_Na_Four_Graph()
        {
            int[] supply = { 25, 45, 30 };
            int[] demand = { 35, 20, 25, 20 };
            int[,] cost = {
                { 4, 2, 5, 3 },
                { 3, 6, 1, 2 },
                { 5, 4, 3, 1 }
            };
            int obshStoim;
            int[,] result = MinElement.MinEl(supply, demand, cost, out obshStoim);

            Assert.AreEqual(20, result[0, 1]);
            Assert.AreEqual(25, result[1, 2]);
            Assert.AreEqual(20, result[2, 3]);
            Assert.AreEqual(20, result[1, 0]);
            Assert.IsTrue(result[0, 3] == 5 || result[0, 0] == 5);
        }

        [TestMethod]
        public void MinElement_SumZapasov_ravna_SumPotreb()
        {
            int[] supply = { 25, 45, 30 };
            int[] demand = { 35, 20, 25, 20 };
            int[,] cost = {
                { 4, 2, 5, 3 },
                { 3, 6, 1, 2 },
                { 5, 4, 3, 1 }
            };
            int obshStoim;
            MinElement.MinEl(supply, demand, cost, out obshStoim);
            Assert.AreEqual(215, obshStoim);
        }

        [TestMethod]
        public void MinElement_Odna_Para()
        {
            int[] supply = { 15 };
            int[] demand = { 15 };
            int[,] cost = { { 7 } };
            int obshStoim;
            int[,] result = MinElement.MinEl(supply, demand, cost, out obshStoim);
            Assert.AreEqual(15, result[0, 0]);
            Assert.AreEqual(105, obshStoim);
        }

        [TestMethod]
        public void MinElement_NulevoyZapas()
        {

            int[] supply = { 0, 20, 30 };
            int[] demand = { 20, 10, 20 };
            int[,] cost = {
                { 1, 2, 3 },
                { 4, 1, 2 },
                { 3, 5, 1 }
            };
            int obshStoim;
            int[,] result = MinElement.MinEl(supply, demand, cost, out obshStoim);

            Assert.AreEqual(0, result[0, 0]);
            Assert.AreEqual(10, result[1, 1]);
            Assert.AreEqual(20, result[2, 2]);
            Assert.AreEqual(10, result[2, 0]);
            Assert.AreEqual(10, result[1, 0]);

            Assert.AreEqual(0, result[0, 1]);
            Assert.AreEqual(0, result[0, 2]);
            Assert.AreEqual(0, result[1, 2]);
            Assert.AreEqual(0, result[2, 1]);

            Assert.AreEqual(100, obshStoim);
        }

        [TestMethod]
        public void MinElement_NulevayaPotrebnost()
        {
            int[] supply = { 20, 30, 10 };
            int[] demand = { 0, 30, 30 };
            int[,] cost = {
                { 2, 1, 3 },
                { 4, 2, 1 },
                { 3, 5, 2 }
            };
            int obshStoim;
            int[,] result = MinElement.MinEl(supply, demand, cost, out obshStoim);

            Assert.AreEqual(20, result[0, 1]);
            Assert.AreEqual(30, result[1, 2]);
            Assert.AreEqual(0, result[2, 0]);
            Assert.AreEqual(10, result[2, 1]);

            Assert.AreEqual(0, result[0, 0]);
            Assert.AreEqual(0, result[0, 2]);
            Assert.AreEqual(0, result[1, 0]);
            Assert.AreEqual(0, result[1, 1]);
            Assert.AreEqual(0, result[2, 2]);

            Assert.AreEqual(100, obshStoim);
        }
    }
}