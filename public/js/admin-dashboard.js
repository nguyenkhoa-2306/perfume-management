document.addEventListener("DOMContentLoaded", () => {
  // Delete perfume
  document.querySelectorAll(".btnDeletePerfume").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = btn.dataset.id;
      if (confirm("Delete this perfume?")) {
        const res = await fetch(`/api/perfumes/${id}`, { method: "DELETE" });
        if (res.ok) {
          window.location.reload();
        } else {
          alert("Deletion failed for perfume");
        }
      }
    });
  });

  // Delete brand
  document.querySelectorAll(".btnDeleteBrand").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = btn.dataset.id;
      if (confirm("Delete this brand?")) {
        const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
        if (res.ok) {
          window.location.reload();
        } else {
          const json = await res.json();
          alert("Error: " + (json.message || "Deletion failed for brand"));
        }
      }
    });
  });

  // Edit & Add can be implemented similarly
});
