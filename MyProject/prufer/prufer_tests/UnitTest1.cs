using System.Collections.Generic;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using prufer;

namespace prufer_tests
{
    [TestClass]
    public class PruferTests
    {
        [TestMethod]
        public void KodPrufera_Put_4()
        {
            var rebra = new List<KeyValuePair<int, int>>
            {
                new KeyValuePair<int, int>(0, 1),
                new KeyValuePair<int, int>(1, 2),
                new KeyValuePair<int, int>(2, 3)
            };
            int[] kod = Prufer.Pruferr(rebra, 4);
            CollectionAssert.AreEqual(new int[] { 1, 2 }, kod);
        }

        [TestMethod]
        public void KodPrufera_Zvezda_4()
        {
            var rebra = new List<KeyValuePair<int, int>>
            {
                new KeyValuePair<int, int>(0, 1),
                new KeyValuePair<int, int>(0, 2),
                new KeyValuePair<int, int>(0, 3)
            };
            int[] kod = Prufer.Pruferr(rebra, 4);
            CollectionAssert.AreEqual(new int[] { 0, 0 }, kod);
        }

        [TestMethod]
        public void KodPrufera_TriVershiny()
        {
            var rebra = new List<KeyValuePair<int, int>>
            {
                new KeyValuePair<int, int>(0, 1),
                new KeyValuePair<int, int>(1, 2)
            };
            int[] kod = Prufer.Pruferr(rebra, 3);
            Assert.AreEqual(1, kod.Length);
            Assert.AreEqual(1, kod[0]);
        }


        [TestMethod]
        public void KodPrufera_Derevo_SVetvleniem_4()
        {
            var rebra = new List<KeyValuePair<int, int>>
            {
                new KeyValuePair<int, int>(0, 1),
                new KeyValuePair<int, int>(1, 2),
                new KeyValuePair<int, int>(1, 3)
            };
            int[] kod = Prufer.Pruferr(rebra, 4);
            
            CollectionAssert.AreEqual(new int[] { 1, 1 }, kod);
        }

        [TestMethod]
        public void KodPrufera_DveVershiny()
        {
            var rebra = new List<KeyValuePair<int, int>>
            {
                new KeyValuePair<int, int>(0, 1)
            };
            int[] kod = Prufer.Pruferr(rebra, 2);
            Assert.AreEqual(0, kod.Length);
        }
    }
}