import {
  ACCENT,
  CATEGORIES,
  Field,
  InfoIcon,
  MAX_IMAGES,
  MAX_MESSAGE_LENGTH,
  MegaphoneIcon,
  NAV,
  SuccessState,
  UploadIcon,
  useFeedbackDrawer,
  XIcon,
  XSmallIcon,
} from "./FeedbackDrawer.helpers";

export default function FeedbackDrawer() {
  const {
    open,
    submitted,
    submitting,
    submitError,
    form,
    errors,
    previews,
    fileInputRef,
    handleOpen,
    handleClose,
    handleDone,
    setField,
    addImages,
    removeImage,
    handleSubmit,
  } = useFeedbackDrawer();

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Open Titans Feedback"
        className="group fixed bottom-6 right-6 z-40 flex items-center gap-0 overflow-hidden rounded-full px-4 py-4 text-white shadow-lg transition-all duration-300 ease-in-out hover:gap-2 hover:pr-5 focus:outline-none"
        style={{ backgroundColor: NAV }}
      >
        <MegaphoneIcon className="h-5 w-5 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ease-in-out group-hover:max-w-[10rem]">
          Titans Feedback
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Titans Feedback"
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[460px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className="flex shrink-0 items-center gap-3 px-6 py-5"
          style={{ backgroundColor: NAV }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <MegaphoneIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">Titans Feedback</h2>
            <p className="text-xs text-white/70">
              Help us improve your Titans fan experience.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
            aria-label="Close feedback drawer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6">
          {submitted ? (
            <SuccessState onDone={handleDone} />
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <Field label="Category" required error={errors.category}>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4B92DB]"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Subject" required error={errors.subject}>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  placeholder="Briefly describe your idea or issue"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B92DB]"
                />
              </Field>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Message <span className="text-red-600">*</span>
                  </label>
                  <span className="text-xs text-gray-400">
                    {form.message.length} / {MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <textarea
                  value={form.message}
                  onChange={(e) => setField("message", e.target.value)}
                  placeholder="Tell us what happened or what you would improve…"
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B92DB]"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Upload screenshots or images{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-gray-300 hover:bg-gray-100"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addImages(e.dataTransfer.files);
                  }}
                >
                  <UploadIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    Click to upload or drag and drop
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    PNG, JPG or WEBP. Up to 5 images.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpg,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => addImages(e.target.files)}
                  />
                </div>
                {previews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative">
                        <img
                          src={src}
                          alt={`Preview ${i + 1}`}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                          aria-label={`Remove image ${i + 1}`}
                        >
                          <XSmallIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ backgroundColor: `${ACCENT}20` }}
              >
                <InfoIcon className="h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                <p className="text-xs" style={{ color: ACCENT }}>
                  Messages are reviewed to keep the community respectful. Images are sent with the feedback submission.
                </p>
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none"
                style={{ backgroundColor: NAV }}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
