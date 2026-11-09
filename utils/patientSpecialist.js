const API = 'http://bayan.runasp.net'

function clean(value) {
  return String(value || '').trim()
}

function digits(value) {
  return clean(value).replace(/\D/g, '')
}

function samePerson(user, patient) {
  if (!user || !patient) return false
  const uid = Number(user.id ?? user.patientId)
  const pid = Number(patient.patientId)
  if (Number.isFinite(uid) && Number.isFinite(pid) && uid === pid) return true

  const uf = clean(user.firstName).toLowerCase()
  const ul = clean(user.lastName).toLowerCase()
  const pf = clean(patient.firstName).toLowerCase()
  const pl = clean(patient.lastName).toLowerCase()
  if (uf && ul && uf === pf && ul === pl) return true

  const up = digits(user.phone)
  const pp = digits(patient.phone)
  return up.length >= 8 && up === pp
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

/**
 * يبحث إن كان حساب الدخول مرتبطاً بمختص عبر Patients_Specialists.
 * يعيد المختص + تفاصيل العلاج، أو null إن لم يوجد ارتباط.
 */
export async function fetchLinkedSpecialist(user) {
  if (!user) return null

  const specialistsPayload = await getJson(
    `${API}/API/Specialist/All?PageNumber=1&PageSize=50`
  )
  const specialists = specialistsPayload?.specialistList || []
  if (!specialists.length) return null

  for (const spec of specialists) {
    const linked = await getJson(
      `${API}/API/Patient_Specialist/GetAllPatientsLinkedToSpecificSpecialist?SpecialistId=${spec.id}&PageNumber=1&PageSize=50`
    )
    const patients = linked?.listPatients || []
    const match = patients.find((p) => samePerson(user, p))
    if (!match) continue

    const first = clean(spec.first_Name)
    const last = clean(spec.last_Name)
    return {
      id: spec.id,
      name: [first, last].filter(Boolean).join(' ') || `مختص ${spec.id}`,
      specialization: clean(spec.specialization),
      typeOfTreatment: clean(match.typeOfTreatment),
      patientId: match.patientId,
    }
  }

  return null
}
