useEffect(() => {
  console.log("Solo corre una vez al inicio")
}, [])

useEffect(() => {
  console.log("Corre cada vez que cambia usuario")
}, [usuario])



function Vista({ cargando }) {
  return cargando ? <p>Cargando...</p> : <p>Listo</p>
}
