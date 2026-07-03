using Microsoft.VisualStudio.TestTools.UnitTesting;
using northwest;

namespace northwest_tests
{
    [TestClass]
    public class NorthwestTests
    {
        [TestMethod]
        public void SevZap_Pravilniy_Plan()
        {
            int[] zapasy = { 20, 40, 30 };
            int[] potrebnosti = { 30, 20, 25, 15 };
            int[,] cost = {
                { 3, 1, 4, 2 },
                { 2, 5, 3, 1 },
                { 4, 2, 1, 3 }
            };
            int obshStoim;
            int[,] result = NorthwestCorner.SevZap(zapasy, potrebnosti, cost, out obshStoim);

            Assert.AreEqual(20, result[0, 0]);
            Assert.AreEqual(10, result[1, 0]);
            Assert.AreEqual(20, result[1, 1]);
            Assert.AreEqual(10, result[1, 2]);
            Assert.AreEqual(15, result[2, 2]);
            Assert.AreEqual(15, result[2, 3]);

            Assert.AreEqual(0, result[0, 1]);
            Assert.AreEqual(0, result[0, 2]);
            Assert.AreEqual(0, result[0, 3]);
            Assert.AreEqual(0, result[1, 3]);
            Assert.AreEqual(0, result[2, 0]);
            Assert.AreEqual(0, result[2, 1]);
        }

        [TestMethod]
        public void SevZap_Obschaya_Stoimost()
        {
            int[] zapasy = { 20, 40, 30 };
            int[] potrebnosti = { 30, 20, 25, 15 };
            int[,] cost = {
                { 3, 1, 4, 2 },
                { 2, 5, 3, 1 },
                { 4, 2, 1, 3 }
            };
            int obshStoim;
            NorthwestCorner.SevZap(zapasy, potrebnosti, cost, out obshStoim);
            Assert.AreEqual(270, obshStoim);
        }

        [TestMethod]
        public void SevZap_Odna_Para()
        {
            int[] zapasy = { 12 };
            int[] potrebnosti = { 12 };
            int[,] cost = { { 6 } };
            int obshStoim;
            int[,] result = NorthwestCorner.SevZap(zapasy, potrebnosti, cost, out obshStoim);
            Assert.AreEqual(12, result[0, 0]);
            Assert.AreEqual(72, obshStoim);
        }


        [TestMethod]
        public void SevZap_NulevoyZapas()
        {

            int[] zapasy = { 0, 30, 20 };
            int[] potrebnosti = { 20, 30 };
            int[,] cost = {
                { 2, 3 },
                { 1, 4 },
                { 5, 2 }
            };
            int obshStoim;
            int[,] result = NorthwestCorner.SevZap(zapasy, potrebnosti, cost, out obshStoim);

            Assert.AreEqual(0, result[0, 0]);
            Assert.AreEqual(20, result[1, 0]);
            Assert.AreEqual(10, result[1, 1]);
            Assert.AreEqual(20, result[2, 1]);

            Assert.AreEqual(0, result[0, 1]);
            Assert.AreEqual(0, result[2, 0]);

            Assert.AreEqual(100, obshStoim);
        }

        [TestMethod]
        public void SevZap_NulevayaPotrebnost()
        {

            int[] zapasy = { 25, 35 };
            int[] potrebnosti = { 0, 30, 20 };
            int[,] cost = {
                { 5, 2, 3 },
                { 4, 1, 6 }
            };
            int obshStoim;
            int[,] result = NorthwestCorner.SevZap(zapasy, potrebnosti, cost, out obshStoim);
            Assert.AreEqual(0, result[0, 0]);
            Assert.AreEqual(25, result[0, 1]);
            Assert.AreEqual(5, result[1, 1]);
            Assert.AreEqual(20, result[1, 2]);

            Assert.AreEqual(0, result[0, 2]);
            Assert.AreEqual(0, result[1, 0]);

            Assert.AreEqual(175, obshStoim);
        }
    }
}